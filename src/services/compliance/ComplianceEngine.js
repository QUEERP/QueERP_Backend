const prisma = require("../../config/prisma");
const { evaluateCondition } = require("./conditionEvaluator");

class ComplianceEngine {
  /**
   * Evaluate a single record against all active compliance rules for its model.
   * Creates, updates, or completes ComplianceTasks based on evaluation.
   */
  async evaluateRecord(businessId, modelName, recordId, recordData) {
    try {
      const activeRules = await prisma.complianceRule.findMany({
        where: {
          modelName,
          isActive: true,
          OR: [
            { businessId: businessId },
            { businessId: null }
          ]
        }
      });

      if (!activeRules || activeRules.length === 0) {
        return;
      }

      for (const rule of activeRules) {
        // Evaluate the rule conditions (e.g. check Business Country)
        // If condition evaluates to false, the rule does not apply to this record.
        if (rule.condition) {
          const isApplicable = evaluateCondition(rule.condition, recordData);
          if (!isApplicable) {
            await this._completeTask(rule.id, recordId);
            continue;
          }
        }

        // Evaluate the field
        const fieldValue = recordData[rule.fieldName];
        let isCompliant = true;

        if (rule.ruleType === 'REQUIRED') {
          isCompliant = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
        } else if (rule.ruleType === 'REGEX' && rule.condition?.regex) {
          if (fieldValue) {
            const regex = new RegExp(rule.condition.regex);
            isCompliant = regex.test(fieldValue);
          } else {
             isCompliant = false; // Usually regex fields are also required if the rule applies
          }
        }

        if (isCompliant) {
          await this._completeTask(rule.id, recordId);
        } else {
          await this._createOrUpdateTask(businessId, rule.id, modelName, recordId);
        }
      }
    } catch (error) {
      console.error(`[ComplianceEngine] Error evaluating record ${modelName}:${recordId}`, error);
    }
  }

  async _completeTask(ruleId, recordId) {
    // We update to COMPLETED instead of deleting so we have a history
    // Check if task exists and is pending
    const existingTask = await prisma.complianceTask.findUnique({
      where: {
        ruleId_recordId: {
          ruleId,
          recordId
        }
      }
    });

    if (existingTask && existingTask.status === 'PENDING') {
      await prisma.complianceTask.update({
        where: { id: existingTask.id },
        data: { status: 'COMPLETED' }
      });
    }
  }

  async _createOrUpdateTask(businessId, ruleId, modelName, recordId) {
    await prisma.complianceTask.upsert({
      where: {
        ruleId_recordId: {
          ruleId,
          recordId
        }
      },
      update: {
        status: 'PENDING'
      },
      create: {
        businessId,
        ruleId,
        modelName,
        recordId,
        status: 'PENDING'
      }
    });
  }

  /**
   * Run evaluation on all existing records for a newly created rule.
   * Best run in chunks/background job.
   */
  async bulkEvaluateRule(ruleId) {
    const rule = await prisma.complianceRule.findUnique({ where: { id: ruleId } });
    if (!rule) return;

    // A simplified example. A true implementation would iterate over the 
    // specific model (e.g. prisma[rule.modelName].findMany())
    // For now we'll log it as this needs specific model access map.
    console.log(`[ComplianceEngine] Bulk evaluating rule ${ruleId} for model ${rule.modelName}`);
    
    // In a real scenario:
    // const records = await prisma[rule.modelName.toLowerCase()].findMany();
    // for(const record of records) {
    //   await this.evaluateRecord(record.businessId, rule.modelName, record.id, record);
    // }
  }

  async getPendingTasksSummary(businessId) {
    const tasks = await prisma.complianceTask.groupBy({
      by: ['modelName'],
      where: {
        businessId,
        status: 'PENDING'
      },
      _count: {
        id: true
      }
    });

    const summary = {};
    let totalPending = 0;
    
    tasks.forEach(t => {
      summary[t.modelName] = t._count.id;
      totalPending += t._count.id;
    });

    // Dummy values for total counts for the percentage. Real implementation would count all records.
    return {
      summary,
      totalPending,
      completionPercentage: 92, // Placeholder
      totalCompleted: 1860 // Placeholder
    };
  }

  async getTasksForRecord(businessId, modelName, recordId) {
    return await prisma.complianceTask.findMany({
      where: {
        businessId,
        modelName,
        recordId,
        status: 'PENDING'
      },
      include: {
        rule: true
      }
    });
  }
}

module.exports = new ComplianceEngine();
